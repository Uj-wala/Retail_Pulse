import uuid

from sqlalchemy import text
from sqlalchemy.engine import Engine


def ensure_sales_schema(engine: Engine) -> None:
    if engine.dialect.name != "postgresql":
        return

    statements = [
        'ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS \'INVENTORY_UPDATED\'',
        'ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS \'SALE_UPDATED\'',
        'ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS \'SALE_DELETED\'',
        'ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS \'PRODUCT_MARKED_OUT_OF_STOCK\'',
        'DO $$ BEGIN CREATE TYPE "SalesChannel" AS ENUM (\'RETAIL_STORE\', \'ONLINE_STORE\', \'MARKETPLACE\'); EXCEPTION WHEN duplicate_object THEN NULL; END $$',
        'DO $$ BEGIN CREATE TYPE "PaymentMethod" AS ENUM (\'CASH\', \'CARD\', \'UPI\', \'BANK_TRANSFER\'); EXCEPTION WHEN duplicate_object THEN NULL; END $$',
        "ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_number VARCHAR",
        "ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_date TIMESTAMPTZ",
        'ALTER TABLE sales ADD COLUMN IF NOT EXISTS sales_channel "SalesChannel"',
        'ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method "PaymentMethod"',
        "ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ",
        "UPDATE sales SET sale_date = COALESCE(sale_date, created_at)",
        "UPDATE sales SET sales_channel = COALESCE(sales_channel, 'RETAIL_STORE'::\"SalesChannel\")",
        "UPDATE sales SET payment_method = COALESCE(payment_method, 'CASH'::\"PaymentMethod\")",
        "UPDATE sales SET updated_at = COALESCE(updated_at, created_at)",
        """
        WITH numbered AS (
            SELECT id,
                   'INV-' || EXTRACT(YEAR FROM COALESCE(sale_date, created_at))::int || '-' ||
                   LPAD(ROW_NUMBER() OVER (
                       PARTITION BY company_id, EXTRACT(YEAR FROM COALESCE(sale_date, created_at))::int
                       ORDER BY created_at, id
                   )::text, 6, '0') AS generated_invoice
            FROM sales
            WHERE invoice_number IS NULL OR invoice_number = ''
        )
        UPDATE sales
        SET invoice_number = numbered.generated_invoice
        FROM numbered
        WHERE sales.id = numbered.id
        """,
        "ALTER TABLE sales ALTER COLUMN invoice_number SET NOT NULL",
        "ALTER TABLE sales ALTER COLUMN sale_date SET NOT NULL",
        "ALTER TABLE sales ALTER COLUMN sales_channel SET NOT NULL",
        "ALTER TABLE sales ALTER COLUMN payment_method SET NOT NULL",
        "ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS category_id VARCHAR REFERENCES categories(id)",
        "ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount NUMERIC(12, 2) DEFAULT 0 NOT NULL",
        "ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS tax NUMERIC(12, 2) DEFAULT 0 NOT NULL",
        "ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS total NUMERIC(12, 2)",
        "UPDATE sale_items SET total = COALESCE(total, subtotal)",
        """
        UPDATE sale_items
        SET category_id = products.category_id
        FROM products
        WHERE sale_items.product_id = products.id
          AND sale_items.category_id IS NULL
        """,
        "ALTER TABLE sale_items ALTER COLUMN total SET NOT NULL",
        "CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_company_invoice_number ON sales(company_id, invoice_number)",
        "CREATE INDEX IF NOT EXISTS ix_sales_company_id_sale_date ON sales(company_id, sale_date)",
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_product_schema(engine: Engine) -> None:
    if engine.dialect.name != "postgresql":
        return

    rename_statements = [
        """
        DO $$ BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'products' AND column_name = 'price'
            ) THEN
                ALTER TABLE products RENAME COLUMN price TO unit_price;
            END IF;
        END $$
        """,
        """
        DO $$ BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'products' AND column_name = 'cost'
            ) THEN
                ALTER TABLE products RENAME COLUMN cost TO cost_price;
            END IF;
        END $$
        """,
    ]

    with engine.begin() as connection:
        for statement in rename_statements:
            connection.execute(text(statement))

        orphan_company_ids = connection.execute(
            text("SELECT DISTINCT company_id FROM products WHERE category_id IS NULL")
        ).scalars().all()

        for company_id in orphan_company_ids:
            category_id = connection.execute(
                text("SELECT id FROM categories WHERE company_id = :company_id AND name = 'Uncategorized'"),
                {"company_id": company_id},
            ).scalar()

            if not category_id:
                category_id = str(uuid.uuid4())
                connection.execute(
                    text(
                        """
                        INSERT INTO categories (id, company_id, name, description, is_active, created_at, updated_at)
                        VALUES (:id, :company_id, 'Uncategorized', NULL, true, now(), now())
                        """
                    ),
                    {"id": category_id, "company_id": company_id},
                )

            connection.execute(
                text(
                    "UPDATE products SET category_id = :category_id "
                    "WHERE company_id = :company_id AND category_id IS NULL"
                ),
                {"category_id": category_id, "company_id": company_id},
            )

        connection.execute(text("ALTER TABLE products ALTER COLUMN category_id SET NOT NULL"))


def ensure_inventory_schema(engine: Engine) -> None:
    if engine.dialect.name != "postgresql":
        return

    audit_action_statements = [
        'ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS \'STOCK_ADDED\'',
        'ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS \'STOCK_REMOVED\'',
        'ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS \'STOCK_ADJUSTED\'',
        'ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS \'REORDER_LEVEL_UPDATED\'',
        'ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS \'PRODUCT_LOW_STOCK\'',
        'ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS \'PRODUCT_OUT_OF_STOCK\'',
    ]

    # ALTER TYPE ... ADD VALUE cannot run inside the same transaction as a later
    # statement that uses the new value, but backfilling below doesn't reference
    # these values, so a single connection.begin() per statement is unnecessary here.
    with engine.begin() as connection:
        for statement in audit_action_statements:
            connection.execute(text(statement))

    with engine.begin() as connection:
        missing = connection.execute(
            text(
                """
                SELECT p.id, p.company_id, p.stock_quantity, p.reorder_level
                FROM products p
                LEFT JOIN inventory i ON i.product_id = p.id
                WHERE i.id IS NULL
                """
            )
        ).all()

        for product_id, company_id, stock_quantity, reorder_level in missing:
            if stock_quantity <= 0:
                stock_status = "OUT_OF_STOCK"
            elif stock_quantity <= reorder_level:
                stock_status = "LOW_STOCK"
            else:
                stock_status = "IN_STOCK"

            connection.execute(
                text(
                    """
                    INSERT INTO inventory (id, company_id, product_id, current_stock, reserved_stock, available_stock, reorder_level, stock_status, updated_at)
                    VALUES (:id, :company_id, :product_id, :stock, 0, :stock, :reorder_level, :status, now())
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "company_id": company_id,
                    "product_id": product_id,
                    "stock": stock_quantity,
                    "reorder_level": reorder_level,
                    "status": stock_status,
                },
            )


def ensure_dashboard_schema(engine: Engine) -> None:
    if engine.dialect.name != "postgresql":
        return

    statements = [
        'ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS \'DASHBOARD_VIEWED\'',
        'ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS \'DASHBOARD_FILTERS_APPLIED\'',
        'ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS \'REPORT_EXPORTED\'',
        'ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS \'DASHBOARD\'',
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_audit_log_schema(engine: Engine) -> None:
    if engine.dialect.name != "postgresql":
        return

    statements = [
        """
        DO $$ BEGIN
            CREATE TYPE "AuditEntityType" AS ENUM (
                'COMPANY', 'USER', 'CATEGORY', 'PRODUCT', 'INVENTORY', 'SALE', 'REPORT'
            );
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
        """,
        'ALTER TABLE audit_logs ALTER COLUMN entity_type TYPE "AuditEntityType" USING entity_type::text::"AuditEntityType"',
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))

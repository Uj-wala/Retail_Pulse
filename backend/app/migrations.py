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

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    access_token_expire_minutes: int = 20
    refresh_token_expire_days: int = 7
    cors_origins: str = "http://localhost:5173"
    port: int = 4000
    environment: str = "development"

    password_reset_token_expire_minutes: int = 30
    frontend_url: str = "http://localhost:5173"

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    smtp_from_email: str = "no-reply@retailpulse.app"
    smtp_from_name: str = "RetailPulse"

    # Customer segmentation thresholds (see services/customer.py::compute_segment). Configurable via
    # env so they can be retuned per-deployment without a code change.
    # New: 0-2 orders. Regular: 3-10 orders. Loyal: 11-30 orders OR revenue > loyal_min_revenue.
    # VIP: orders > vip_min_orders OR revenue > vip_min_revenue.
    customer_regular_min_orders: int = 3
    customer_loyal_min_orders: int = 11
    customer_loyal_min_revenue: float = 50_000
    customer_vip_min_orders: int = 30
    customer_vip_min_revenue: float = 200_000
    customer_large_purchase_threshold: float = 50_000
    customer_inactivity_days: int = 90
    customer_inactivity_renotify_days: int = 30

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def email_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_username and self.smtp_password)

    @property
    def sqlalchemy_database_url(self) -> str:
        return self.database_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

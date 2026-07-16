from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str = "dev-secret-key-change-me"
    access_token_expire_minutes: int = 20
    refresh_token_expire_days: int = 7
    cors_origins: str = "http://localhost:5173"
    port: int = 4000

    password_reset_token_expire_minutes: int = 30
    frontend_url: str = "http://localhost:5173"

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    smtp_from_email: str = "no-reply@retailpulse.app"
    smtp_from_name: str = "RetailPulse"

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

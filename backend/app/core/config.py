from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration.

    Values are loaded from environment variables and .env.
    Pydantic automatically validates and converts types.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "PulseWatch"
    debug: bool = True

    # JWT settings
    jwt_algorithm: str = "HS256"
    # Access tokens are intentionally short-lived (15 min) to limit the exposure
    # window if a token is somehow intercepted.
    access_token_expire_minutes: int = 15
    # Refresh tokens live much longer. Rotation means only the latest one is valid.
    refresh_token_expire_days: int = 7

    database_url: str
    jwt_secret: str

    # Resend Email Settings
    resend_api_key: str = ""  # Default empty string so it doesn't fail immediately in tests without it
    # URL of the frontend app, used to construct reset links
    frontend_url: str = "http://localhost:5173"

# Singleton settings instance
settings = Settings()
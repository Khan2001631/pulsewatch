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

    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    database_url: str
    jwt_secret: str



# Singleton settings instance
settings = Settings()
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    frontend_origin: str = "http://localhost:5173"
    # Added when the corresponding features are built:
    # deepgram_api_key: str = ""
    # gemini_api_key: str = ""


settings = Settings()

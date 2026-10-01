from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    frontend_origin: str = "http://localhost:5173"
    deepgram_api_key: str = ""
    # Added when the corresponding features are built:
    # gemini_api_key: str = ""


settings = Settings()

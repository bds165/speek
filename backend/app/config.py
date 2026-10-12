from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    frontend_origin: str = "http://localhost:5173"
    deepgram_api_key: str = ""
    gemini_api_key: str = ""
    # Flash-Lite: Gemini's fast, low-cost tier. Coaching needs a few short paragraphs, not depth.
    gemini_model: str = "gemini-3.5-flash-lite"


settings = Settings()

from config import Settings


def test_database_url_can_be_configured():
    settings = Settings(database_url="sqlite:///./review-test.db")

    assert settings.database_url == "sqlite:///./review-test.db"

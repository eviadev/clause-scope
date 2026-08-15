from config import Settings


def test_settings_split_configured_origins():
    settings = Settings(
        cors_origins="https://app.example, https://review.example ,",
    )

    assert settings.allowed_origins == [
        "https://app.example",
        "https://review.example",
    ]


def test_basic_auth_is_not_configured_without_both_values():
    assert not Settings(auth_mode="basic").basic_auth_configured
    assert not Settings(
        auth_mode="basic",
        basic_username="reviewer",
    ).basic_auth_configured
    assert Settings(
        auth_mode="basic",
        basic_username="reviewer",
        basic_password="unique-value",
    ).basic_auth_configured

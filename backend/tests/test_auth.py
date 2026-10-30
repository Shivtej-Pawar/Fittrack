"""
Tests for POST /auth/register, POST /auth/login, and the JWT-based auth
dependency (get_current_user) that every protected route relies on.
"""

from tests.conftest import unique_email


def test_register_creates_user_and_hides_password(client):
    email = unique_email()
    response = client.post(
        "/api/v1/auth/register",
        json={"full_name": "Jane Doe", "email": email, "password": "SecurePass123"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == email
    assert body["full_name"] == "Jane Doe"
    # UserResponse must never leak the hash back to the client.
    assert "hashed_password" not in body
    assert "password" not in body


def test_register_rejects_duplicate_email(client):
    email = unique_email()
    payload = {"full_name": "First", "email": email, "password": "SecurePass123"}

    first = client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409


def test_register_rejects_short_password(client):
    """
    Backend validation fix (post-launch audit): the frontend's Register
    form already requires 8+ characters, but the backend previously had
    no such rule at all — meaning a direct API call (bypassing the
    browser entirely) could create an account with e.g. a 1-character
    password. This confirms the fix in app/schemas/user.py actually
    rejects that at the API layer, independent of what the frontend does.
    """
    response = client.post(
        "/api/v1/auth/register",
        json={"full_name": "Test", "email": unique_email(), "password": "short"},
    )
    assert response.status_code == 422


def test_register_rejects_blank_full_name(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"full_name": "", "email": unique_email(), "password": "SecurePass123"},
    )
    assert response.status_code == 422


def test_login_succeeds_with_correct_credentials(client):
    email = unique_email()
    password = "SecurePass123"
    client.post(
        "/api/v1/auth/register",
        json={"full_name": "Login Test", "email": email, "password": password},
    )

    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert len(body["access_token"]) > 0


def test_login_rejects_wrong_password(client):
    email = unique_email()
    client.post(
        "/api/v1/auth/register",
        json={"full_name": "Wrong PW", "email": email, "password": "SecurePass123"},
    )

    response = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "TotallyWrongPassword"}
    )

    assert response.status_code == 401


def test_login_rejects_unknown_email(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody-such-user@example.com", "password": "whatever123"},
    )
    assert response.status_code == 401


def test_login_error_message_does_not_reveal_which_field_was_wrong(client):
    """
    Security property, not just a functional one: an "incorrect email or
    password" message is intentionally identical whether the email
    doesn't exist or the password is wrong for a real account — so a
    caller can't use the error text to enumerate which emails are
    registered. Both branches in app/routers/auth.py's login() are
    checked here to confirm they actually return the exact same message.
    """
    email = unique_email()
    client.post(
        "/api/v1/auth/register",
        json={"full_name": "Same Message", "email": email, "password": "SecurePass123"},
    )

    wrong_password = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "WrongPassword1"}
    )
    unknown_email = client.post(
        "/api/v1/auth/login",
        json={"email": "does-not-exist@example.com", "password": "WhateverPass1"},
    )

    assert wrong_password.json()["detail"] == unknown_email.json()["detail"]


def test_protected_endpoint_rejects_missing_token(client):
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401


def test_protected_endpoint_rejects_garbage_token(client):
    response = client.get(
        "/api/v1/users/me", headers={"Authorization": "Bearer not-a-real-jwt"}
    )
    assert response.status_code == 401


def test_protected_endpoint_accepts_valid_token(client, registered_user):
    user, headers = registered_user
    response = client.get("/api/v1/users/me", headers=headers)

    assert response.status_code == 200
    assert response.json()["email"] == user["email"]

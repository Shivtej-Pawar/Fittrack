"""
Tests for the workout endpoints — CRUD, and specifically the
authorization boundary that matters most for this project: one user
must never be able to read, edit, or delete another user's workout.
"""

STRENGTH_PAYLOAD = {
    "category": "Strength",
    "muscle_group": "Chest",
    "exercise_name": "Bench Press",
    "variation": "Barbell",
    "set_entries": [{"set": 1, "reps": 10, "weight": 60.0}],
}


def test_create_workout_requires_auth(client):
    response = client.post("/api/v1/workouts", json=STRENGTH_PAYLOAD)
    assert response.status_code == 401


def test_create_and_retrieve_own_workout(client, registered_user):
    _, headers = registered_user

    create_response = client.post(
        "/api/v1/workouts", json=STRENGTH_PAYLOAD, headers=headers
    )
    assert create_response.status_code == 201
    workout = create_response.json()
    assert workout["exercise_name"] == "Bench Press"
    assert workout["set_entries"] == [{"set": 1, "reps": 10, "weight": 60.0}]
    # user_id is intentionally never echoed back — the client already
    # knows whose workouts these are (they authenticated as that user).
    assert "user_id" not in workout

    list_response = client.get("/api/v1/workouts", headers=headers)
    assert list_response.status_code == 200
    ids = [w["id"] for w in list_response.json()]
    assert workout["id"] in ids


def test_users_only_see_their_own_workouts(client, registered_user):
    """
    Core data-isolation guarantee: two different users' workout lists
    must never overlap, even though both are hitting the exact same
    GET /workouts endpoint.
    """
    user_a, headers_a = registered_user

    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "User B",
            "email": f"userb-{user_a['id']}@example.com",
            "password": "SecurePass123",
        },
    )
    login_b = client.post(
        "/api/v1/auth/login",
        json={
            "email": f"userb-{user_a['id']}@example.com",
            "password": "SecurePass123",
        },
    )
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    client.post(
        "/api/v1/workouts",
        json={**STRENGTH_PAYLOAD, "exercise_name": "User A's Squat"},
        headers=headers_a,
    )
    client.post(
        "/api/v1/workouts",
        json={**STRENGTH_PAYLOAD, "exercise_name": "User B's Deadlift"},
        headers=headers_b,
    )

    workouts_a = client.get("/api/v1/workouts", headers=headers_a).json()
    workouts_b = client.get("/api/v1/workouts", headers=headers_b).json()

    names_a = {w["exercise_name"] for w in workouts_a}
    names_b = {w["exercise_name"] for w in workouts_b}

    assert "User A's Squat" in names_a
    assert "User B's Deadlift" not in names_a
    assert "User B's Deadlift" in names_b
    assert "User A's Squat" not in names_b


def test_update_own_workout(client, registered_user):
    _, headers = registered_user
    created = client.post(
        "/api/v1/workouts", json=STRENGTH_PAYLOAD, headers=headers
    ).json()

    updated_payload = {**STRENGTH_PAYLOAD, "exercise_name": "Incline Bench Press"}
    response = client.put(
        f"/api/v1/workouts/{created['id']}", json=updated_payload, headers=headers
    )

    assert response.status_code == 200
    assert response.json()["exercise_name"] == "Incline Bench Press"


def test_delete_own_workout(client, registered_user):
    _, headers = registered_user
    created = client.post(
        "/api/v1/workouts", json=STRENGTH_PAYLOAD, headers=headers
    ).json()

    delete_response = client.delete(f"/api/v1/workouts/{created['id']}", headers=headers)
    assert delete_response.status_code == 200

    list_response = client.get("/api/v1/workouts", headers=headers)
    ids = [w["id"] for w in list_response.json()]
    assert created["id"] not in ids


def test_cannot_update_another_users_workout(client, registered_user):
    """
    IDOR check: User A creates a workout; User B (a completely different,
    also-authenticated account) tries to edit it by guessing/incrementing
    the id. This must be rejected with 403, not silently succeed.
    """
    user_a, headers_a = registered_user
    created = client.post(
        "/api/v1/workouts", json=STRENGTH_PAYLOAD, headers=headers_a
    ).json()

    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Attacker",
            "email": f"attacker-{user_a['id']}@example.com",
            "password": "SecurePass123",
        },
    )
    login_attacker = client.post(
        "/api/v1/auth/login",
        json={
            "email": f"attacker-{user_a['id']}@example.com",
            "password": "SecurePass123",
        },
    )
    headers_attacker = {
        "Authorization": f"Bearer {login_attacker.json()['access_token']}"
    }

    response = client.put(
        f"/api/v1/workouts/{created['id']}",
        json={**STRENGTH_PAYLOAD, "exercise_name": "Hijacked"},
        headers=headers_attacker,
    )
    assert response.status_code == 403

    # Confirm the workout was genuinely untouched, not just that the
    # attacker's own request was rejected.
    unchanged = client.get("/api/v1/workouts", headers=headers_a).json()
    names = {w["exercise_name"] for w in unchanged}
    assert "Bench Press" in names
    assert "Hijacked" not in names


def test_cannot_delete_another_users_workout(client, registered_user):
    user_a, headers_a = registered_user
    created = client.post(
        "/api/v1/workouts", json=STRENGTH_PAYLOAD, headers=headers_a
    ).json()

    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Attacker 2",
            "email": f"attacker2-{user_a['id']}@example.com",
            "password": "SecurePass123",
        },
    )
    login_attacker = client.post(
        "/api/v1/auth/login",
        json={
            "email": f"attacker2-{user_a['id']}@example.com",
            "password": "SecurePass123",
        },
    )
    headers_attacker = {
        "Authorization": f"Bearer {login_attacker.json()['access_token']}"
    }

    response = client.delete(
        f"/api/v1/workouts/{created['id']}", headers=headers_attacker
    )
    assert response.status_code == 403

    # Still there, from the real owner's point of view.
    still_present = client.get("/api/v1/workouts", headers=headers_a).json()
    assert created["id"] in [w["id"] for w in still_present]


def test_nonexistent_workout_returns_404(client, registered_user):
    """No GET /workouts/{id} route exists in this API — PUT is used to
    probe the 404-before-403 ownership-check ordering instead (see
    app/routers/workouts.py's _get_owned_workout_or_404)."""
    _, headers = registered_user
    response = client.put(
        "/api/v1/workouts/999999999", json=STRENGTH_PAYLOAD, headers=headers
    )
    assert response.status_code == 404


def test_create_workout_rejects_invalid_category(client, registered_user):
    """
    Backend validation fix (post-launch audit): `category` used to be an
    unconstrained string. This confirms an invalid value is now rejected
    with 422 rather than being silently stored.
    """
    _, headers = registered_user
    response = client.post(
        "/api/v1/workouts",
        json={**STRENGTH_PAYLOAD, "category": "NotARealCategory"},
        headers=headers,
    )
    assert response.status_code == 422


def test_create_workout_rejects_negative_reps(client, registered_user):
    _, headers = registered_user
    response = client.post(
        "/api/v1/workouts",
        json={
            **STRENGTH_PAYLOAD,
            "set_entries": [{"set": 1, "reps": -5, "weight": 60.0}],
        },
        headers=headers,
    )
    assert response.status_code == 422


def test_create_workout_rejects_negative_weight(client, registered_user):
    _, headers = registered_user
    response = client.post(
        "/api/v1/workouts",
        json={
            **STRENGTH_PAYLOAD,
            "set_entries": [{"set": 1, "reps": 10, "weight": -1}],
        },
        headers=headers,
    )
    assert response.status_code == 422


def test_create_workout_rejects_blank_exercise_name(client, registered_user):
    _, headers = registered_user
    response = client.post(
        "/api/v1/workouts",
        json={**STRENGTH_PAYLOAD, "exercise_name": ""},
        headers=headers,
    )
    assert response.status_code == 422

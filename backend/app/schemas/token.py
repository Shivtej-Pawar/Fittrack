"""
Pydantic schema for JWT token responses.

Separate from app/schemas/user.py because it describes a different
resource entirely — not a user, but the credential issued after a
successful login. Kept minimal on purpose.
"""

from pydantic import BaseModel


class Token(BaseModel):
    """
    Shape of the response returned by POST /auth/login on success.
    `token_type` is always "bearer", matching the `Authorization: Bearer
    <token>` header format clients are expected to send on subsequent
    requests.
    """

    access_token: str
    token_type: str = "bearer"

# Local access and privacy

Read-only app credentials are configured in the ignored `.env`. The user confirms they came from a different new app. Do not paste or print them. Registration uses a free Pro account at https://www.ravelry.com/pro/developer. Use **HTTP Basic Auth: read only access**, not full personal-account access.

A fresh authorised user can copy `.env.example` to `.env`, set owner-only permissions, and enter their own app-issued username/password. Environment variables take precedence. The example contains placeholders only. No collector runs automatically during setup or tests. Live collection requires the explicit `--private-use` acknowledgement; this records the intended local scope and does not claim provider permission.

The old permission flags remain false because neither the user nor this project can certify blanket publication permission. They are not API authorisation checks. Collection proceeds under the user's express private-use instruction; the actual agreement constraints remain documented in data_feasibility.md. No further credentials are needed from the user.

To inspect configuration without values, run `python -m ravelry_analytics.check_config`. Its pending permission messages and non-zero exit code refer to that review state, not invalid API credentials. API access was separately verified by the real bounded sample. Never use this command as a network health test.

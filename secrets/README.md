# Docker Secrets

This directory contains Docker secrets for sensitive database credentials.

## Setup

Create the following files (without the `.example` extension):

1. **db_user.txt** - Database username
2. **db_password.txt** - Database password
3. **db_name.txt** - Database name

Example:
```bash
echo -n "tasteloop" > db_user.txt
echo -n "your_secure_password" > db_password.txt
echo -n "tasteloop" > db_name.txt
```

**Important**:
- Use `echo -n` (no newline) to avoid adding extra whitespace
- These files are gitignored and should never be committed
- Copy from `.example` files and modify as needed

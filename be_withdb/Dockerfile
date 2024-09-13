# Use the official PostgreSQL image from the Docker Hub
FROM postgres:latest

# Environment variables for the default database and user
ENV POSTGRES_DB=tododb
ENV POSTGRES_USER=youruser
ENV POSTGRES_PASSWORD=yourpassword

# Copy the initialization SQL script to the Docker image
COPY init.sql /docker-entrypoint-initdb.d/
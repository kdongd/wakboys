# 1) frontend
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# 2) backend (frontend bundled as static files -> one Render service, same origin)
FROM gradle:8.14.3-jdk21 AS api
WORKDIR /app
COPY backend/ ./
COPY --from=web /web/dist/ src/main/resources/static/
RUN gradle bootJar --no-daemon -x test

# 3) runtime
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=api /app/build/libs/wakboys.jar app.jar
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -XX:TieredStopAtLevel=1"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

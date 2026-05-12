FROM eclipse-temurin:21-jdk-jammy AS build

WORKDIR /workspace

COPY .mvn .mvn
COPY mvnw .
COPY pom.xml .

RUN tr -d '\r' < mvnw > mvnw-linux \
    && mv mvnw-linux mvnw \
    && chmod +x mvnw

RUN ./mvnw -q -DskipTests dependency:go-offline

COPY src src

RUN ./mvnw -q -DskipTests package \
    && cp target/*.jar app.jar

FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

COPY --from=build /workspace/app.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]

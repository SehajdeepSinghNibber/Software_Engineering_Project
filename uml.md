# UML Diagrams - Image De-hazing Platform

This document describes the main user interactions, software classes, and image de-hazing workflow implemented by the project.

## 1. Use Case Diagram

```mermaid
flowchart LR
    USER([User])
    ADMIN([System Administrator])
    API((Fastify API))
    ML((Python ML Service))
    DB[(MongoDB)]

    UC1((Create account))
    UC2((Sign in))
    UC3((Sign out))
    UC4((Manage profile))
    UC5((Check authentication))
    UC6((View dashboard))
    UC7((View model catalog))
    UC8((Check service health))
    UC9((Upload hazy image))
    UC10((Select dehazing model))
    UC11((Set image size))
    UC12((Dehaze image))
    UC13((View or download result))
    UC14((Validate request))
    UC15((Run model inference))

    USER --> UC1
    USER --> UC2
    USER --> UC3
    USER --> UC4
    USER --> UC6
    USER --> UC7
    USER --> UC8
    USER --> UC9
    USER --> UC10
    USER --> UC11
    USER --> UC13

    UC9 -. includes .-> UC12
    UC10 -. extends .-> UC12
    UC11 -. extends .-> UC12
    UC12 -. includes .-> UC14
    UC12 -. includes .-> UC15

    UC1 --> API
    UC2 --> API
    UC3 --> API
    UC4 --> API
    UC5 --> API
    UC6 --> API
    UC7 --> API
    UC8 --> API
    UC9 --> API
    UC12 --> API
    UC15 --> ML
    UC1 --> DB
    UC2 --> DB
    UC4 --> DB
    ADMIN --> UC8
    ADMIN --> UC7
```

### Use Case Scenarios

#### UC-01: Create Account

| Item             | Description                                                                                                                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary actor    | User                                                                                                                                                                                                                                                                                           |
| Preconditions    | The user is not signed in and has a valid email address.                                                                                                                                                                                                                                       |
| Main flow        | 1. The user opens the signup page. 2. The user enters full name, email, and password. 3. The frontend sends `POST /api/v1/auth/signup`. 4. The API validates the data and checks email uniqueness. 5. The user record is stored in MongoDB. 6. The API returns an authenticated user response. |
| Alternative flow | If the email already exists or the data is invalid, the API returns an error and the user remains on the signup page.                                                                                                                                                                          |
| Postconditions   | A new user account exists and the session cookie is available.                                                                                                                                                                                                                                 |

#### UC-02: Sign In

| Item             | Description                                                                                                                                                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary actor    | User                                                                                                                                                                                                                                                        |
| Preconditions    | A registered user account exists.                                                                                                                                                                                                                           |
| Main flow        | 1. The user enters email and password. 2. The frontend sends `POST /api/v1/auth/login`. 3. The API loads the user from MongoDB. 4. The password is verified. 5. A JWT session cookie is issued. 6. The user is redirected to the authenticated application. |
| Alternative flow | Invalid credentials produce an authentication error without creating a session.                                                                                                                                                                             |
| Postconditions   | The user is authenticated and can access protected routes.                                                                                                                                                                                                  |

#### UC-03: Dehaze Image

| Item              | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary actor     | Authenticated user                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Supporting actors | Fastify API and Python ML service                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Preconditions     | The user is authenticated and has a supported image file.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Main flow         | 1. The user opens Studio. 2. The user uploads a hazy image. 3. The user selects a model and optional size. 4. The frontend sends a multipart request to `POST /api/v1/ml/dehaze`. 5. JWT middleware verifies the session. 6. The controller validates file type, file size, model, and image size. 7. The ML service adapter forwards the request to `POST /predict`. 8. The Python service preprocesses the image and runs inference. 9. The result is postprocessed into a PNG. 10. The API returns the result as a data URL. 11. The frontend displays the before-and-after result. |
| Alternative flow  | Missing files, unsupported formats, invalid model settings, service timeouts, and inference failures return suitable errors for the frontend to display.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Postconditions    | The user receives a dehazed image. The request is not persisted as a database record.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

#### UC-04: View Model Catalog and Health

| Item             | Description                                                                                                                                                                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary actor    | User or System Administrator                                                                                                                                                                                                                                                                             |
| Preconditions    | The frontend can reach the Fastify API.                                                                                                                                                                                                                                                                  |
| Main flow        | 1. The frontend requests `GET /api/v1/ml/models` and `GET /api/v1/ml/health`. 2. Fastify forwards the requests to the Python service. 3. The service returns supported models and health metadata. 4. The frontend displays model descriptions, default sizes, device, weight state, and service status. |
| Alternative flow | If the service is unavailable, the frontend displays an offline notice and allows retrying.                                                                                                                                                                                                              |
| Postconditions   | The current inference-service state is visible to the user.                                                                                                                                                                                                                                              |

## 2. Class Diagram

```mermaid
classDiagram
    class User {
        +ObjectId _id
        +String email
        +String fullName
        +String password
        +String profilePic
        +Date createdAt
        +Date updatedAt
    }

    class SessionProvider {
        +User user
        +String status
        +signOut() Promise
        +checkAuth() Promise
    }

    class ModelInfo {
        +String name
        +String description
        +Number defaultSize
        +Number divisible
        +String norm
        +String weightsState
        +String device
    }

    class DehazeRequest {
        +File image
        +String model
        +Number size
    }

    class DehazeResult {
        +String outputImage
        +String model
        +Number inputSize
        +Number outputWidth
        +Number outputHeight
        +Number inferenceMs
        +String weightsState
    }

    class ApiClient {
        +signup(payload) Promise
        +login(payload) Promise
        +signout() Promise
        +check() Promise
        +updateProfile(profilePic) Promise
        +models() Promise
        +health() Promise
        +dehaze(payload) Promise
    }

    class FastifyApp {
        +registerPlugins()
        +registerAuthRoutes()
        +registerMLRoutes()
    }

    class AuthController {
        +signup(request, reply)
        +login(request, reply)
        +signout(request, reply)
        +checkAuth(request, reply)
        +updateProfile(request, reply)
    }

    class MLController {
        +dehaze(request, reply)
        +models(request, reply)
        +serviceHealth(request, reply)
        +validateImageFile(file)
        +parseOptions(values)
    }

    class AuthMiddleware {
        +protectRoute(request, reply)
        +verifyJWT(token)
    }

    class MLService {
        +dehazeImage(file, options) Promise
        +listModels() Promise
        +getServiceHealth() Promise
    }

    class InferenceService {
        +health() JSON
        +models() JSON
        +predict(image, model, size) PNG
    }

    class ModelLoader {
        +MODEL_REGISTRY
        +list_models() List
        +load_model(modelName) Model
    }

    class ImagePreprocessor {
        +validate_image(image)
        +letterbox(image, size)
        +normalize(image, model)
    }

    class ImagePostprocessor {
        +crop_to_aspect_ratio(image)
        +resize_to_original(image)
        +encode_png(image) Bytes
    }

    SessionProvider --> User : manages
    SessionProvider --> ApiClient : calls
    ApiClient --> FastifyApp : HTTP requests
    FastifyApp --> AuthController : routes auth requests
    FastifyApp --> MLController : routes ML requests
    AuthController --> AuthMiddleware : protects private operations
    MLController --> AuthMiddleware : protects dehaze
    AuthController --> User : reads and updates
    MLController --> MLService : delegates inference
    MLService --> InferenceService : HTTP request
    InferenceService --> ImagePreprocessor : preprocesses
    InferenceService --> ModelLoader : loads model
    ModelLoader --> ModelInfo : describes models
    InferenceService --> ImagePostprocessor : creates PNG
    ApiClient ..> ModelInfo : returns
    ApiClient ..> DehazeRequest : sends
    ApiClient ..> DehazeResult : receives
```

## 3. Activity Diagram

The following activity diagram represents the authenticated image de-hazing workflow.

```mermaid
flowchart TD
    START((Start)) --> OPEN[Open the Studio page]
    OPEN --> AUTH{Authenticated?}

    AUTH -- No --> LOGIN[Sign in or create an account]
    LOGIN --> AUTH_CHECK{Credentials valid?}
    AUTH_CHECK -- No --> LOGIN_ERROR[Display authentication error]
    LOGIN_ERROR --> LOGIN
    AUTH_CHECK -- Yes --> UPLOAD

    AUTH -- Yes --> UPLOAD[Upload hazy image]
    UPLOAD --> FILE_CHECK{Supported image and size?}
    FILE_CHECK -- No --> FILE_ERROR[Display file validation error]
    FILE_ERROR --> UPLOAD
    FILE_CHECK -- Yes --> SELECT[Select model]

    SELECT --> SIZE[Set optional input size]
    SIZE --> SUBMIT[Submit dehazing request]
    SUBMIT --> JWT{JWT valid?}
    JWT -- No --> UNAUTHORIZED[Display unauthorized error]
    UNAUTHORIZED --> END((End))
    JWT -- Yes --> OPTIONS[Validate model and size options]

    OPTIONS --> OPTIONS_OK{Options valid?}
    OPTIONS_OK -- No --> OPTION_ERROR[Display request validation error]
    OPTION_ERROR --> SELECT
    OPTIONS_OK -- Yes --> FORWARD[Forward multipart request to Python service]

    FORWARD --> PREPROCESS[Read, validate, pad, resize, and normalize image]
    PREPROCESS --> INFER[Load selected model and run inference]
    INFER --> INFER_OK{Inference successful?}
    INFER_OK -- No --> SERVICE_ERROR[Display ML service error]
    SERVICE_ERROR --> END
    INFER_OK -- Yes --> POSTPROCESS[Crop, resize, and encode PNG result]
    POSTPROCESS --> RESPONSE[Return result and metadata through Fastify]
    RESPONSE --> DISPLAY[Display before-and-after comparison]
    DISPLAY --> END
```

## System Boundaries

- The Next.js frontend is responsible for navigation, forms, upload controls, session state, and result presentation.
- The Fastify server is responsible for authentication, validation, routing, API response shaping, and communication with MongoDB and the ML service.
- MongoDB currently persists user accounts only.
- The Python FastAPI service is responsible for preprocessing, model loading, inference, and image postprocessing.
- Dehazing requests and output images are currently returned through the request/response flow and are not persisted.

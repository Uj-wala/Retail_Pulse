import path from "node:path";
import swaggerJsdoc from "swagger-jsdoc";
import { config } from "./env.js";

// glob patterns require forward slashes; path.join emits backslashes on Windows
const toGlobPath = (...segments: string[]) => path.join(...segments).split(path.sep).join("/");

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "RetailPulse API",
      version: "0.1.0",
      description: "REST API for RetailPulse inventory, sales, and analytics.",
    },
    servers: [{ url: `http://localhost:${config.port}/api` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", example: "c0d7a2c1-3b5f-4c6d-8c2d-0c8c5b6b9d25" },
            company_id: { type: "string", example: "9cda069b-418c-4954-a51a-2933a9c64f23" },
            name: { type: "string", example: "Samya Admin" },
            email: { type: "string", format: "email", example: "admin@retailpulse.com" },
            role: {
              type: "string",
              enum: ["SUPER_ADMIN", "COMPANY_ADMIN", "ANALYST", "VIEWER"],
              example: "COMPANY_ADMIN",
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
              example: "ACTIVE",
            },
            last_login: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2026-07-15T10:30:00.000Z",
            },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2026-07-15T09:00:00.000Z",
            },
          },
        },
        UserResponse: {
          type: "object",
          properties: {
            user: { $ref: "#/components/schemas/User" },
          },
        },
        AuthTokenResponse: {
          type: "object",
          properties: {
            access_token: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            refresh_token: {
              type: "string",
              example: "a4f09a7b8e6d4b2c9f1e0d3c5b7a8f6e",
            },
            token_type: { type: "string", example: "bearer" },
            user: { $ref: "#/components/schemas/User" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "admin@retailpulse.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "Password@123",
            },
          },
        },
        RegisterCompanyRequest: {
          type: "object",
          required: [
            "company_name",
            "industry",
            "company_email",
            "company_address",
            "company_phone",
            "owner_name",
            "owner_email",
            "password",
            "confirm_password",
          ],
          properties: {
            company_name: { type: "string", example: "RetailPulse Demo Store" },
            industry: { type: "string", example: "Retail" },
            company_email: {
              type: "string",
              format: "email",
              example: "company@retailpulse.com",
            },
            company_address: { type: "string", example: "123 Market Street" },
            company_phone: { type: "string", example: "+1-555-0100" },
            owner_name: { type: "string", example: "Samya Admin" },
            owner_email: {
              type: "string",
              format: "email",
              example: "admin@retailpulse.com",
            },
            password: {
              type: "string",
              format: "password",
              minLength: 8,
              example: "Password@123",
            },
            confirm_password: {
              type: "string",
              format: "password",
              minLength: 8,
              example: "Password@123",
            },
          },
        },
        RegisterCompanyResponse: {
          type: "object",
          properties: {
            company: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                industry: { type: "string" },
                email: { type: "string", format: "email" },
                address: { type: "string" },
                phone: { type: "string" },
                created_at: { type: "string", format: "date-time" },
                updated_at: { type: "string", format: "date-time" },
              },
            },
            user: { $ref: "#/components/schemas/User" },
            message: { type: "string", example: "Company registered successfully" },
          },
        },
        RefreshTokenRequest: {
          type: "object",
          required: ["refresh_token"],
          properties: {
            refresh_token: {
              type: "string",
              example: "a4f09a7b8e6d4b2c9f1e0d3c5b7a8f6e",
            },
          },
        },
        ForgotPasswordRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "admin@retailpulse.com",
            },
          },
        },
        ChangePasswordRequest: {
          type: "object",
          required: ["current_password", "new_password", "confirm_new_password"],
          properties: {
            current_password: {
              type: "string",
              format: "password",
              example: "Password@123",
            },
            new_password: {
              type: "string",
              format: "password",
              minLength: 8,
              example: "NewPassword@123",
            },
            confirm_new_password: {
              type: "string",
              format: "password",
              minLength: 8,
              example: "NewPassword@123",
            },
          },
        },
        MessageResponse: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
        UserListResponse: {
          type: "object",
          properties: {
            users: {
              type: "array",
              items: { $ref: "#/components/schemas/User" },
            },
            total: { type: "integer", example: 3 },
          },
        },
        InviteUserRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", example: "Store Analyst" },
            email: { type: "string", format: "email", example: "analyst@retailpulse.com" },
            password: { type: "string", format: "password", minLength: 8, example: "Password@123" },
            role: {
              type: "string",
              enum: ["SUPER_ADMIN", "COMPANY_ADMIN", "ANALYST", "VIEWER"],
              default: "VIEWER",
              example: "ANALYST",
            },
          },
        },
        UpdateUserRequest: {
          type: "object",
          properties: {
            name: { type: "string", example: "Updated User" },
            role: {
              type: "string",
              enum: ["SUPER_ADMIN", "COMPANY_ADMIN", "ANALYST", "VIEWER"],
              example: "VIEWER",
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
              example: "ACTIVE",
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    toGlobPath(process.cwd(), "src/routes/*.routes.ts"),
    toGlobPath(process.cwd(), "dist/routes/*.routes.js"),
  ],
});

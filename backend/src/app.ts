import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { config } from "./config/env.js";
import { swaggerSpec } from "./config/swagger.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { companyRouter } from "./routes/company.routes.js";
import { usersRouter } from "./routes/user.routes.js";
import { profileRouter } from "./routes/profile.routes.js";
import { categoryRouter } from "./routes/category.routes.js";
import { productRouter } from "./routes/product.routes.js";
import { inventoryRouter } from "./routes/inventory.routes.js";
import { saleRouter } from "./routes/sale.routes.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { reportRouter } from "./routes/report.routes.js";


export const app = express();

app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api-docs.json", (_req, res) => {
  res.json(swaggerSpec);
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRouter);
app.use("/api/company", companyRouter);
app.use("/api/users", usersRouter);
app.use("/api/profile", profileRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/products", productRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/sales", saleRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/reports", reportRouter);

app.use(errorHandler);

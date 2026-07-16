from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, engine
from .routers import analytics, auth, categories, company, inventory, products, profile, reports, sales, users

settings = get_settings()

app = FastAPI(title="RetailPulse API", version="0.1.0", docs_url="/api-docs", openapi_url="/api-docs.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}


api_routers = [auth.router, company.router, users.router, profile.router, categories.router, products.router, inventory.router, sales.router, analytics.router, reports.router]

for router in api_routers:
    app.include_router(router, prefix="/api")

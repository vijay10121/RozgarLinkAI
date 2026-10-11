from fastapi import FastAPI

from app.routes import router

app = FastAPI(
    title="RozgarLink Matching API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)
app.include_router(router)


@app.get("/healthz")
async def health() -> dict[str, str]:
    return {"status": "ok"}

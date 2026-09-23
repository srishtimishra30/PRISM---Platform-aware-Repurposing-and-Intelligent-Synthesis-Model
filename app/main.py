from fastapi import FastAPI
from app.routes import extract

app = FastAPI(title="PRISM Backend")

app.include_router(extract.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
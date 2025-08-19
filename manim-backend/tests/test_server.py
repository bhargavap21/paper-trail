import uvicorn
from fastapi import FastAPI

app = FastAPI()

@app.get("/test")
def test():
    return {"status": "ok", "message": "Test server is working"}

if __name__ == "__main__":
    print("Starting test server on port 8002...")
    uvicorn.run(app, host="0.0.0.0", port=8002) 
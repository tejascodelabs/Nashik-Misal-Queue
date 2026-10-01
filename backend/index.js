import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import app from "./src/app.js";
import { checkDatabaseConnection } from "./src/db/index.js";
import { getSocketRoom, setSocketIO } from "./src/shared/socket.js";

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
});

setSocketIO(io);

io.on("connection", (socket) => {
  socket.on("shop:join", (shopId) => {
    const parsedShopId = Number(shopId);
    if (Number.isInteger(parsedShopId) && parsedShopId > 0) {
      socket.join(getSocketRoom(parsedShopId));
    }
  });
});

const startServer = async () => {
  try {
    const dbConnected = await checkDatabaseConnection();

    if (!dbConnected) {
      console.error(
        "❌ Server not started because database connection failed"
      );
      process.exit(1);
    }

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
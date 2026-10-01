let io;

export const setSocketIO = (socketServer) => {
  io = socketServer;
};

export const emitToShop = (shopId, event, payload) => {
  io?.to(`shop:${shopId}`).emit(event, payload);
};

export const getSocketRoom = (shopId) => `shop:${shopId}`;
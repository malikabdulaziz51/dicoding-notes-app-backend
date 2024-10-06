const UploadImageHandler = require("./handler");
const routes = require("./routes");

module.exports = {
  name: "uploads",
  version: "1.0.0",
  register: async (server, { service, validator }) => {
    const uploadImageHandler = new UploadImageHandler(service, validator);
    server.route(routes(uploadImageHandler));
  },
};

const routes = (handler) => [
  {
    method: "POST",
    path: "/users",
    handler: handler.postUserHandler,
  },
  {
    method: "GET",
    path: "/users/{userId}",
    handler: handler.getUserByIdHandler,
  },
  {
    method: "GET",
    path: "/users",
    handler: handler.getUsersByUsernameHandler,
  }
];

module.exports = routes;

const Hapi = require("@hapi/hapi");
const process = require("process");
require("dotenv").config();
const Jwt = require("@hapi/jwt");

//Notes
const notes = require("./api/notes");
const NotesService = require("./services/postgres/NotesService");
const NotesValidator = require("./validator/notes");

//Users
const users = require("./api/users");
const UsersService = require("./services/postgres/UsersService");
const UsersValidator = require("./validator/users");

//Authentications
const authentications = require("./api/authentications");
const AuthenticationsService = require("./services/postgres/AuthenticationService");
const TokenManager = require("./tokenize/TokenManager");
const AuthenticationsValidator = require("./validator/authentications");
const ClientError = require("./exceptions/ClientError");

//Collaborations
const CollaborationsService = require("./services/postgres/CollaborationsService");
const collaborations = require("./api/collaborations");
const CollaborationValidator = require("./validator/collaborations");

// Exports
const _exports = require("./api/exports");
const ProducerService = require("./services/rabbitmq/ProducerService");
const ExportValidator = require("./validator/exports");
const uploads = require("./api/uploads");
const StorageService = require("./services/S3/StorageService");
const UploadsValidator = require("./validator/uploads");
const Inert = require("@hapi/inert");

//cache redis
const CacheService = require("./services/redis/CacheService");
const init = async () => {
  const cacheService = new CacheService();
  const collaborationsService = new CollaborationsService(cacheService);
  const notesService = new NotesService(collaborationsService, cacheService);
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  const storageService = new StorageService();
  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ["*"],
      },
    },
  });

  await server.register([
    {
      plugin: Jwt,
    },
    {
      plugin: Inert,
    },
  ]);

  server.auth.strategy("notesapp_jwt", "jwt", {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id,
      },
    }),
  });

  await server.register([
    {
      plugin: notes,
      options: {
        service: notesService,
        validator: NotesValidator,
      },
    },
    {
      plugin: users,
      options: {
        service: usersService,
        validator: UsersValidator,
      },
    },
    {
      plugin: authentications,
      options: {
        authenticationsService: authenticationsService,
        usersService: usersService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator,
      },
    },
    {
      plugin: collaborations,
      options: {
        collaborationsService: collaborationsService,
        notesService: notesService,
        validator: CollaborationValidator,
      },
    },
    {
      plugin: _exports,
      options: {
        service: ProducerService,
        validator: ExportValidator,
      },
    },
    {
      plugin: uploads,
      options: {
        service: storageService,
        validator: UploadsValidator,
      },
    },
  ]);

  server.ext("onPreResponse", (request, h) => {
    // mendapatkan konteks response dari request
    const { response } = request;
    // console.log(response);
    // penanganan client error secara internal.
    if (response instanceof ClientError) {
      const newResponse = h.response({
        status: "fail",
        message: response.message,
      });
      newResponse.code(response.statusCode);
      return newResponse;
    }

    return h.continue;
  });

  await server.start();
  console.log(`Server running at: ${server.info.uri}`);
};

init();

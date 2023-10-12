// Imported resources
const _ = require("lodash");
const express = require("express");
const app = express();
const Redis = require('redis');
const argon2 = require('argon2');
const bodyParser = require('body-parser');
const PORT = 3000;
const GENERIC_LOGIN_ERROR = 'Login Failed';

// NOTES - Chose Argon2 because of its simplicity to implement, implicit salting, and ability to configure
//         by increasing both time and memory cost to match client needs, default settings used.
//       - The VALUE is simply the argon2 hash (with metadata) example: 
//         "$argon2id$v=19$m=65536,t=3,p=4$gKPj27D8Hiy+9bsHTEwOoQ$A0YMeOZxDLAhW/jdMoW5Mp//HyTjj9lsuTcJVN8H8lA"
//       - The "value" field in the future could be changed to a json object to hold key informations 
//         like account status, registration date, ext.
//       - Each subsaquent failure to guess password results in a longer delay between attempts
//       - A successful login will reset this delay, NOTE: delay currentlly is based on user IP,
//         because of this, shared IPs may have trouble if they contain bad actors

app.use(bodyParser.json());
app.post("/api/register", async (req, res) => {
  try {
    const validation = validateRequest(req, false);
    if (!validation.success) {
      res.status(validation.code).send({ 
        success: false, 
        error: validation.message
      });
      return;
    }
    const redisClient = await Redis.createClient().connect();
    if (await redisClient.exists(req.body.username)) {
      res.status(401).send({ 
        success: false, 
        error: "Username Taken" 
      });
      return;
    }
    const hash = await argon2.hash(req.body.password);
    redisClient.set(req.body.username, hash);
    res.status(200).send({ 
      success: true, 
      message: "Registration Success" 
    });
  } catch (err) {
    res.status(401).send({ 
      success: true, 
      message: "Registration Failure" 
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const validation = validateRequest(req);
    if (!validation.success) {
      res.status(validation.code).send({ 
        success: false, 
        error: validation.message
      });
      return;
    }
    const redisClient = await Redis.createClient().connect();

    await testFloodControl(req, redisClient);

    const hash = await redisClient.get(req.body.username);
    if (await argon2.verify(hash, req.body.password)) {
      clearFloodControl(req, redisClient);
      res.status(200).send({ 
        success: true, 
        message: "Login Success" 
      });
    } else {
      res.status(401).send({ 
        success: false, 
        message: GENERIC_LOGIN_ERROR
      });
    }
  } catch (err) {
    res.status(401).send({ 
      success: false, 
      message: GENERIC_LOGIN_ERROR
    });
  }
});

app.post("/api/reset", async (req, res) => {
  const redisClient = await Redis.createClient().connect();
  redisClient.flushAll()
  res.status(200).send({ 
    success: true, 
    message: "Redis Cleared!" 
  });
});

app.post("/api/generateSso", (req, res) => {
  res.status(401).send({ success: false, error: "Not Implemented Yet" });
  // SSO login out of scope
});

app.post("/api/sso", (req, res) => {
  res.status(401).send({ success: false, error: "Not Implemented Yet" });
  // SSO login out of scope
});

app.post("/api/generateResetToken", (req, res) => {
  res.status(401).send({ success: false, error: "Not Implemented Yet" });
  // Password reset out of scope
});

app.post("/api/resetPassword", (req, res) => {
  res.status(401).send({ success: false, error: "Not Implemented Yet" });
  // Password reset out of scope
});

app.listen(PORT, () => {
  console.log('Auth server active, listening on ' + PORT);
})

async function testFloodControl(req, redisClient) {
  let delay = await redisClient.get(req.socket.remoteAddress);
  if (delay) {
    redisClient.set(req.socket.remoteAddress, delay * 2);
    await new Promise(resolve => setTimeout(resolve, 1000 * delay));
  } else {
    redisClient.set(req.socket.remoteAddress, 1);
  }
}

function clearFloodControl(req, redisClient) {
  redisClient.del(req.socket.remoteAddress);
}

function validateRequest(req, ambiguous = true) {
  const usernameRegex = new RegExp("^[a-zA-Z0-9]{3,16}$");
  const passwordRegex = new RegExp("^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,20}$");
  let ret = {success: true, message: false};
  if (!req.body) {
    ret.message = "Malformed Request";
  } else if (!req.body.password) {
    ret.message = "Password Is Required";
  } else if (!passwordRegex.test(req.body.password)) {
    ret.message = "Password must be at least 8 characters, contain one number, and one special character";
  } else if (!usernameRegex.test(req.body.username)) {
    ret.message = "Username must be between 3 and 16 alphanumaric characters" 
  }
  if (ret.message) {
    ret.success = false;
    ret.code = 401;
    ret.message = ambiguous ? GENERIC_LOGIN_ERROR : ret.message;
  }
  return ret;
}
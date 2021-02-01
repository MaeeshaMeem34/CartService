const functions = require("firebase-functions");
const admin = require("firebase-admin");

var serviceAccount = require("./cartservice_permission_key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const express = require("express");
const app = express();
const db = admin.firestore();

const cors = require("cors");
app.use(cors({ origin: true }));

var guid = require("guid");

const bodyparser = require("body-parser");
app.use(bodyparser.json());

//adding product to cart
app.post("/cart/add/:name", (req, res) => {
  (async () => {
    try {
      if (req.headers["session-id"] == undefined) {
        var ID = guid.create();
        var sessionId = ID.value;
        const ref = db.collection("cart");
        await ref
          .add({
            Name: req.params.name,
            Count: 1,
            session_id: sessionId,
          })
          .then(() => {
            res.writeHead(200, {
              "session-id": sessionId,
            });
            res.end();
          });
      } else {
        var session = req.headers["session-id"];

        var id;
        var count;
        const ref = db.collection("cart");
        const snapshot = await ref
          .where("session_id", "==", session)
          .where("Name", "==", req.params.name)
          .get()
          .then(function (querySnapshot) {
            querySnapshot.forEach(function (doc) {
              id = doc.id;
              count = doc.data().Count;
            });
          });

        if (id == "") {
          await ref
            .add({
              Name: req.params.name,
              Count: 1,
              session_id: session,
            })
            .then(() => {
              res.status(200).send("product added!");
            });
        } else {
          await ref
            .doc(id)
            .update({
              Count: count + 1,
            })
            .then(() => {
              res.status(200).send("product count increased!");
            });
        }
      }
    } catch (error) {
      return res.status(500).send(error);
    }
  })();
});

// get product from the cart
app.get("/cart", (req, res) => {
  (async () => {
    try {
      var sessionId = req.headers["session-id"];

      var products = [];
      if (sessionId == undefined) {
        res.send("session id undefined!");
      } else {
        const ref = db.collection("cart");
        const snapshot = await ref
          .where("session_id", "==", sessionId)
          .get()
          .then(function (querySnapshot) {
            querySnapshot.forEach(function (doc) {
              let temp = [];
              temp = {
                Name: doc.data().Name,
                Count: doc.data().Count,
              };
              products.push(temp);
              //console.log(doc.data());
            });
          });
        return res.status(200).send(products);
      }
    } catch (error) {
      return res.status(500).send(error);
    }
  })();
});

//delete product from the cart

app.delete("/cart/remove/:item", (req, res) => {
  (async () => {
    try {
      var id = "";
      if (req.headers["session-id"] == undefined) {
        res.send("session undefined!");
      } else {
        const ref = db.collection("cart");
        const snapshot = await ref
          .where("session_id", "==", req.headers["session-id"])
          .where("Name", "==", req.params.item)
          .get()
          .then(function (querySnapshot) {
            querySnapshot.forEach(function (doc) {
              id = doc.id;
            });
          });
        if (id == "") {
          return res.status(200).send("Product does not exist!");
        } else {
          await ref
            .doc(id)
            .delete()
            .then(function () {
              return res.status(200).send("Product deleted!");
            });
        }
      }
    } catch (error) {
      return res.send("Product could not be deleted!");
    }
  })();
});

exports.app = functions.https.onRequest(app);

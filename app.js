const express = require("express")
const mongoose = require("mongoose")
const path = require("path")
const cors = require("cors")
const multer = require("multer")
const fs = require("fs")
const { google } = require("googleapis");
const OAuth2Data = require("./credential.json");

const app = express()
app.use(cors({ origin: "*" }))

const port = process.env.PORT || 5000




// view engine setup
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "ejs")

app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

// Multer Setup
const Storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./videos");
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
  },
})

var upload = multer({
  storage: Storage,
}).single("file")
//   <------------------ All Route Start From Here ------------------>


// Handle The Oauth
const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);

let auth = false
const SCOPES = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/userinfo.profile"

app.get("/", (req, res) => {

  if (!auth) {
    const url = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    })

    console.log(url);

    res.render("index", { url: url })
  } else {

    var oauth2 = google.oauth2({
      auth: oAuth2Client,
      version: "v2",
    })

    oauth2.userinfo.get((err, res) => {
      if (err) {
        console.log(err)
        console.log("Error Someting")
      } else {
        console.log(res.data);
      }
    })

  }
})

app.get("/google/callback", (req, res) => {

  const code = req.query.code

  console.log(code);

  if (code) {
    oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        console.log(err)
        console.log("Error Something");
      } else {
        console.log("Successfully authenticated");
        console.log(token);

        oAuth2Client.setCredentials(token)
        auth = true;
        res.redirect("/")
      }
    })
  }
})

//Upload

app.post("/upload", (req, res) => {
  console.log("Uplaoda");

  const { title, description, tags } = req.body

  upload(req, res, (err) => {
    if (err) {
      console.log(err)
      console.log("Error Happened");
    } else {
      console.log(req.file.path);

      const youtube = google.youtube({
        version: "v3",
        auth: oAuth2Client
      });

      console.log(youtube)

      youtube.videos.insert({
        resource: {
          snippet: {
            title: title,
            description: description,
            tags: tags
          },
          status: {
            privacyStatus: "private",
          },
        },
        part: "snippet,status",
        media: {
          body: fs.createReadStream(req.file.path)
        }
      }, (err, data) => {
        if (err) {
          console.log(err)
          console.log("Error Happened");
        } else {
          console.log("Upload Sucessfully");
        }

        fs.unlinkSync(req.file.path)

      })


    }
  })

})








//   <------------------ All Route End Here ------------------>
//Server Listen Port
app.listen(port, () => {
  console.log(`Server is runnin at ${port}`)
})

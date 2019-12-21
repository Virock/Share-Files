eslint-disable
<template>
  <div class="container">
    <b-jumbotron>
      <H1>Share files</H1>
    </b-jumbotron>
    <b-card v-for="(file, index) in data" :value="file.value" :key="file.value">
      <div class="row">
      <b-card-text class="col-md-11"><a :href="'/api/files/' + file._id">{{file.originalname}}</a></b-card-text>
      <b-button @click="deleteFile(file._id, index)" class="pull-right">Delete</b-button>
      </div>
    </b-card>
    <!-- <div> -->
    <br />
    <div class="links text-center">
      <div>{{ file_message }}</div>
      <input type="file" multiple @change="fileChanged" />
      <a tabindex="1" class="button--green" @click="sendFiles">Send files</a>
    </div>
    <!--
      <h1 class="title">
        Share Clipboard
      </h1>
      <h2 class="subtitle">
        App to share clipboard across devices
      </h2>
      <div>{{ message }}</div>
      <div class="links">
        <a tabindex="1" class="button--green" @click="sendClipboard">
          Send clipboard
        </a>
        <a tabindex="1" class="button--grey" @click="receiveClipboard">
          Receive clipboard
        </a>
      </div>
    </div>-->
  </div>
</template>

<script>
import Logo from "~/components/Logo.vue";
import axios from "~/plugins/axios";
const FormData = require("form-data");
let context;
export default {
  components: {
    Logo
  },
  created() {
    context = this;
  },
  async asyncData({
    isDev,
    route,
    store,
    env,
    params,
    query,
    req,
    res,
    redirect,
    error
  }) {
    //Read all files in database
    //Return to this page
    //If error, show error
    let data;
    await axios
      .get("/api/files")
      .then(function(res) {
        data = res.data;
      })
      .catch(function(err) {
        console.log("Error occured while getting files");
        console.log(err.error);
      });
      return { data };
  },
  methods: {
    async fileChanged(event) {
      this.files = event.target.files;
      // console.log(this.files);
    },
    async sendFiles() {
      const form_data = new FormData();
      for (let i = 0; i < this.files.length; i++)
      form_data.append("files", this.files[i]);
      axios
        .post("/api/files", form_data, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        })
        .then(function() {
          context.file_message = "File(s) successfully uploaded";
          setTimeout(function() {
            context.file_message = "";
          }, 3000);
        })
        .catch(function(err) {
          console.log(err)
          context.file_message = "Error occured while uploading file(s)";
          setTimeout(function() {
            context.file_message = "";
          }, 3000);
        });
    },
    async deleteFile(id, index) {
      axios.delete(`/api/files/${id}`)
        .then(function() {
         context.data.splice(index, 1);
        })
        .catch(function(err) {
          console.log(err)
          context.file_message = "Error occured while deleting file";
          setTimeout(function() {
            context.file_message = "";
          }, 3000);
        });
    },
    async sendClipboard() {
      const clipboard_text = await navigator.clipboard.readText();
      const res = await axios.post(`/api/data`, { data: clipboard_text });
      context.message = "Clipboard sent successfully";
      setTimeout(function() {
        context.message = "";
      }, 3000);
      //Show notification that text has been sent
    },
    async receiveClipboard() {
      const res = await axios.get(`/api/data`);
      await navigator.clipboard.writeText(res.data.value);
      context.message = "Clipboard received received";
      setTimeout(function() {
        context.message = "";
      }, 3000);
    }
    //Send this device's clipboard to an api endpoint
    // axios.post(`/api/data`, {data: })
    //Api should save clipboard in database
  },
  data() {
    return {
      message: "",
      file_message: "",
      files: null
    };
  }
};
</script>
<style scoped>
a {
  cursor: pointer;
}
</style>
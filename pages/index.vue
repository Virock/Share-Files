<template>
  <div class="container">
    <b-jumbotron>
      <H1>Share files</H1>
    </b-jumbotron>
    <b-card v-for="(file, index) in data" :value="file.value" :key="file.value">
      <div class="row">
        <b-card-text class="col-md-11">
          <a :href="'/api/files/' + file._id">{{file.originalname}}</a>
        </b-card-text>
        <b-button @click="deleteFile(file._id, index)" class="pull-right">Delete</b-button>
      </div>
    </b-card>
    <br />
    <div class="links text-center">
      <div>{{ file_message }}</div>
      <input type="file" multiple @change="fileChanged" id="file_input_field" />
      <a tabindex="1" class="button--green" @click="sendFiles">{{working ? "Uploading...": "Send files"}}</a>
    </div>
  </div>
</template>

<script>
import axios from "~/plugins/axios";
const FormData = require("form-data");
let context;
export default {
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
        console.log("Error occurred while getting files");
        console.log(err.error);
      });
    return { data };
  },
  methods: {
    async fileChanged(event) {
      this.files = event.target.files;
    },
    async sendFiles() {
      const form_data = new FormData();
      for (let i = 0; i < this.files.length; i++)
        form_data.append("files", this.files[i]);
      context.working = true;
      axios
        .post("/api/files", form_data, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        })
        .then(function() {
          //Clear the files input field
          document.getElementById("file_input_field").value = null;
          //Refresh the page
          location.reload();
          context.working = false;
        })
        .catch(function(err) {
          context.working = false;
          console.log(err);
          context.file_message = "Error occurred while uploading file(s)";
          setTimeout(function() {
            context.file_message = "";
          }, 3000);
        });
    },
    async deleteFile(id, index) {
      axios
        .delete(`/api/files/${id}`)
        .then(function() {
          context.data.splice(index, 1);
        })
        .catch(function(err) {
          console.log(err);
          context.file_message = "Error occurred while deleting file";
          setTimeout(function() {
            context.file_message = "";
          }, 3000);
        });
    }
  },
  data() {
    return {
      message: "",
      file_message: "",
      files: null,
      working: false
    };
  }
};
</script>
<style scoped>
a {
  cursor: pointer;
}
</style>

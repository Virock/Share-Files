<template>
  <div class="container">
    <b-jumbotron>
      <H1>Share files</H1>
    </b-jumbotron>
    <br/>
    <div class="links text-center">
      <div>{{ file_message }}</div>
      <input type="file" multiple @change="fileChanged" id="file_input_field" />
      <button class="btn button--green" @click="sendFiles">{{working ? `Uploaded ${progress}%`: "Send files"}}</button>
    </div>
    <br/>
    <b-card v-for="(file, index) in data" :value="file.value" :key="file.value">
      <div class="row">
        <b-card-text class="col-md-11">
          <a :href="'/api/files/' + file._id">{{file.originalname}}</a>
        </b-card-text>
        <b-button @click="deleteFile(file._id, index)" class="pull-right">Delete</b-button>
      </div>
    </b-card>
    <br />
    <div class="links text-center" v-if="data && data.length > 0">
      <a tabindex="1" class="button--red" @click="deleteAll">{{deleting ? "Deleting...": "Delete All Files"}}</a>
    </div>
    <br/>
  </div>
</template>

<script>
const FormData = require("form-data");
const axios = require("axios");
const clientSecret = require("../clientSecret");
let context;
export default {
  created() {
    context = this;
  },
  async asyncData(ctx) {
    //Read all files in database
    //Return to this page
    //If error, show error
    let data;
    await axios
      .get(`${clientSecret.homepage}/api/files`)
      .then(function(res) {
        data = res.data;
      })
      .catch(function (error) {
        if (error.response.status === 401) {
          data = [];
        }
      });
    return { data };
  },
  methods: {
    async fileChanged(event) {
      this.files = event.target.files;
    },
    async deleteAll(){
      context.deleting = true;
      axios.delete(`${clientSecret.homepage}/api/files/`)
        .then(function(res){
          location.reload();
        })
      .catch(function(error)
      {
        let message = "Something went wrong";
        if (error.response.status === 401)
          message = "You lack authorization";
        alert(message);
        context.deleting = false;
      })
    },
    async sendFiles() {
      const form_data = new FormData();
      for (let i = 0; i < this.files.length; i++)
        form_data.append("files", this.files[i]);
      context.working = true;
      axios
        .post("/api/files", form_data, {
          onUploadProgress: (progressEvent) => {
            const {loaded, total} = progressEvent;
            context.progress = Math.floor((loaded * 100) / total);
          },
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
        .catch(function(error) {
          context.working = false;
          if (error.response.status === 401)
            context.file_message = "You lack authorization";
          else
            context.file_message = "Error occurred while uploading file(s)";
          setTimeout(function() {
            context.file_message = "";
          }, 3000);
        });
    },
    async deleteFile(id, index) {
      context.$axios
        .$delete(`${clientSecret.homepage}/api/files/${id}`)
        .then(function() {
          context.data.splice(index, 1);
        })
        .catch(function(error) {
          if (error.response.status === 401)
            context.file_message = "You lack authorization";
          else
            context.file_message = "Error occurred while deleting file";
          setTimeout(function() {
            context.file_message = "";
          }, 3000);
        });
    }
  },
  data() {
    return {
      progress: 0,
      message: "",
      file_message: "",
      files: null,
      working: false,
      deleting: false
    };
  }
};
</script>
<style scoped>
a {
  cursor: pointer;
}
</style>

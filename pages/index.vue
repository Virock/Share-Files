<template>
  <div class="container">
    <div class="p-1 mb-4 bg-light rounded-3 border">
      <div class="container-fluid py-5">
        <h1 class="display-5 fw-bold text-center">Share files</h1>
      </div>
    </div>
    <br/>
    <div class="links text-center">
      <div>{{ file_message }}</div>
      <input type="file" multiple @change="fileChanged" id="file_input_field" />
      <button class="btn button--green" @click="sendFiles">{{working ? `Uploaded ${progress}%`: "Send files"}}</button>
    </div>
    <br/>
    <b-card v-for="(file, index) in data" :value="file.value" :key="file.value" style="margin: 10px">
      <div class="row align-items-center">
        <div class="col-md-11">
          <a :href="'/api/files/' + file.id" class="text-decoration-none">
            {{ file.originalname }}
          </a>
        </div>

        <div class="col-md-1 d-flex justify-content-end">
          <button
            type="button"
            class="btn btn-danger btn-sm"
            @click="deleteFile(file.id, index)">
            Delete
          </button>
        </div>
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
      this.$axios.delete(`${clientSecret.homepage}/api/files/`)
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
      this.$axios
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

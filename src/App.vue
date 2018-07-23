<template>
  <el-container id='app'>
    <el-header></el-header>
    <el-main>
      <router-view/>
    </el-main>
    <el-footer>@Zulko 2018</el-footer>
</el-container>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

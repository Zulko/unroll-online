<template lang='pug'>
#website
  github-corners(repo="Edinburgh-Genome-Foundry" bg-color='#8ac1e8')
  router-view
  footersection
</template>

<script>
import footersection from './components/Footer'
export default {
  name: 'App',
  components: {
    footersection
  }
}
</script>

<style lang='scss'>
@import url('https://fonts.googleapis.com/css?family=Oswald|Limelight|Lato');
body {
  background-image: url(assets/paper.png);
  padding-top: 60px;
  padding-bottom: 60px;
}
#website {
  font-family: 'Lato', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  hr {
    border : 0;
    height: 1px;
    margin-top: 60px;
    margin-bottom: 60px;
    background-image: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0));
  }
  h3 {
    font-family: 'Oswald', sans-serif;
    font-size: 1.6em;
    margin-bottom: 1em;
  }
}
</style>

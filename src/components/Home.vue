<template lang='pug'>
.unroll
  h1 UNROLL
  h2 A piano roll transcription assistant
  p Unroll is a web application to simplify the transcription of piano roll scans in MIDI format into sheet music. It can find the real tempo of the midi file, roughly separate the hands, and quantize the notes.

  transcriber
</template>

<script>
import transcriber from './Transcriber'
export default {
  components: {
    transcriber
  }
}
</script>

<style lang='scss' scoped>
@import url('https://fonts.googleapis.com/css?family=Oswald|Limelight');
.unroll {
  margin: 0 auto;
  max-width: 800px;
  font-size: 18px;
  h1 {
    font-family: 'Limelight', sans-serif;
    font-size: 6em;
    margin-bottom: 0;
    text-align: center;
  }
  h2 {
    margin-top: 0;
    font-family: 'Oswald', sans-serif;
    text-align: center;
  }
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}

.tempo-plot {
  margin: 0 auto;
  width: 600px;
  height: 200px;
}

.scale-plot {
  margin: 0 auto;
  width: 600px;
  height: 200px;
}

</style>

<style>
.ct-label.ct-label.ct-horizontal {
  position: fixed;
  justify-content: flex-end;
  text-align: right;
  transform-origin: 100% 0;
  transform: translate(-100%) rotate(-60deg);
}
.ct-series-a path, .ct-series-a .ct-bar {
  stroke: #88b1da !important;
}
</style>

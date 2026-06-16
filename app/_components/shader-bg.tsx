'use client'

import { useEffect, useRef } from 'react'

const VS = `
attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const FS = `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec2 v_texCoord;

void main() {
  vec2 uv = v_texCoord;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;

  vec3 color = vec3(0.984, 0.976, 0.973);

  float time = u_time * 0.1;
  vec2 grid_uv = uv * 20.0;
  grid_uv.x += sin(time + grid_uv.y * 0.5) * 0.2;
  grid_uv.y += cos(time + grid_uv.x * 0.5) * 0.2;

  vec2 f = fract(grid_uv) - 0.5;

  float pattern = smoothstep(0.05, 0.0, length(f) - 0.02);
  float lines = smoothstep(0.02, 0.0, abs(f.x) - 0.005)
              + smoothstep(0.02, 0.0, abs(f.y) - 0.005);

  float mask = mix(pattern, lines, 0.5) * 0.03;
  color -= mask;

  vec3 accent = vec3(0.784, 0.471, 0.227);
  color = mix(color, accent, 0.02);

  gl_FragColor = vec4(color, 1.0);
}`

export function ShaderBg() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    const gl = (
      canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')
    ) as WebGLRenderingContext | null
    if (!gl) return

    function sync() {
      if (!canvas) return
      const w = canvas.clientWidth || 1280
      const h = canvas.clientHeight || 720
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }

    const ro = new ResizeObserver(sync)
    ro.observe(canvas)
    sync()

    function makeShader(type: number, src: string) {
      const s = gl!.createShader(type)!
      gl!.shaderSource(s, src)
      gl!.compileShader(s)
      return s
    }

    const prog = gl.createProgram()!
    gl.attachShader(prog, makeShader(gl.VERTEX_SHADER, VS))
    gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    )

    const posLoc = gl.getAttribLocation(prog, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(prog, 'u_time')
    const uRes = gl.getUniformLocation(prog, 'u_resolution')

    let raf: number
    function draw(t: number) {
      sync()
      gl!.viewport(0, 0, canvas!.width, canvas!.height)
      if (uTime) gl!.uniform1f(uTime, t * 0.001)
      if (uRes) gl!.uniform2f(uRes, canvas!.width, canvas!.height)
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(draw)
    }
    draw(0)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block' }}
    />
  )
}

import { Filter, GlProgram } from 'pixi.js';

const vertex = `
  in vec2 aPosition;
  out vec2 vTextureCoord;

  uniform vec4 uInputSize;
  uniform vec4 uOutputFrame;
  uniform vec4 uOutputTexture;

  vec4 filterVertexPosition( void )
  {
      vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;

      position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
      position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

      return vec4(position, 0.0, 1.0);
  }

  vec2 filterTextureCoord( void )
  {
      return aPosition * (uOutputFrame.zw * uInputSize.zw);
  }

  void main(void)
  {
      gl_Position = filterVertexPosition();
      vTextureCoord = filterTextureCoord();
  }
`;

const fragment = `
  in vec2 vTextureCoord;

  uniform sampler2D uTexture;
  uniform float uTime;

  void main(void)
  {
      vec2 uv = vTextureCoord;

      // lightweight "simulated motion" wobble
      float waveX = sin((uv.y * 32.0) + uTime * 6.0) * 0.002;
      float waveY = cos((uv.x * 28.0) + uTime * 5.0) * 0.002;

      vec4 col = texture2D(uTexture, uv + vec2(waveX, waveY));
      gl_FragColor = col;
  }
`;

export class WobbleFilter extends Filter {
  time = 0;

  constructor() {
    super({
      glProgram: new GlProgram({
        vertex,
        fragment,
      }),
      resources: {
        timeUniforms: {
          uTime: { value: 0.0, type: 'f32' },
        },
      },
    });
  }

  override apply(...args: Parameters<Filter['apply']>): void {
    this.resources.timeUniforms.uniforms.uTime = this.time;
    super.apply(...args);
  }
}

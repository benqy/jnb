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

  // Injected by host by setting alpha of sprite to carry "hit" info? (cheap trick)
  // We'll instead flash based on very small time-variant noise to add life.

  void main(void)
  {
      vec4 col = texture2D(uTexture, vTextureCoord);

      // subtle shimmer so static sprites feel alive
      float n = sin((vTextureCoord.x + vTextureCoord.y) * 80.0 + uTime * 10.0) * 0.5 + 0.5;
      col.rgb += n * 0.02;

      gl_FragColor = col;
  }
`;

export class HitFlashFilter extends Filter {
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

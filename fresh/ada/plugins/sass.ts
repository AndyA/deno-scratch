import type {
  Plugin,
  PluginAsyncRenderContext,
  PluginRenderContext,
  PluginRenderResult,
  ResolvedFreshConfig,
} from "$fresh/server.ts";

const sassPlugin: () => Plugin = () => ({
  name: "sass-plugin",

  render(ctx: PluginRenderContext): PluginRenderResult {
    const res = ctx.render();
    console.log(`render`, { ctx, res });
    return res;
  },

  async renderAsync(
    ctx: PluginAsyncRenderContext,
  ): Promise<PluginRenderResult> {
    const res = await ctx.renderAsync();
    console.log(`renderAsync`, { ctx, res });
    return res;
  },

  buildStart(config: ResolvedFreshConfig) {
    console.log(`buildStart`, config);
  },

  buildEnd() {
    console.log(`buildEnd`);
  },
});

export default sassPlugin;

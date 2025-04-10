import * as frame from '@farcaster/frame-sdk'

export async function initializeFrame() {
  const context = await frame.sdk.context

  if (!context) {
    return
  }

  let user = context.user

  if (user.user) {
    user = user.user
  }

  if (!user || !user.fid) {
    // most likely not in a frame
    return
  }

  window.userFid = user.fid;

  // Call the ready function to remove your splash screen when in a frame
  await frame.sdk.actions.ready();
}
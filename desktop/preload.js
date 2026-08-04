'use strict';

/**
 * Deliberately empty.
 *
 * A preload script is the one place where privileged APIs can be handed to the
 * page, and ApplyPilot's pages need none: everything they do goes through the
 * local server, which is the same code path the web build uses and the same
 * code path the tests cover. Exposing anything here — a file dialog, a path, a
 * "just this one" IPC channel — would be the easiest way to undo the isolation
 * the window is configured with.
 *
 * The file exists so that `webPreferences.preload` points at something real,
 * and so that adding an API is a visible, deliberate change to this file rather
 * than a quiet change to a config object.
 */

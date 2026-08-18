# SPDX-License-Identifier: LGPL-2.1-or-later

import json
from pathlib import Path
import sys

manifest = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert manifest["app-id"] == "org.awra.Showcase"
assert manifest["runtime"] == "org.gnome.Platform"
assert int(manifest["runtime-version"]) >= 50
assert "--socket=wayland" in manifest["finish-args"]
assert all("--filesystem=" not in arg for arg in manifest["finish-args"])
module = manifest["modules"][0]
assert module["buildsystem"] == "meson"
assert "-Dwayland-effects=enabled" in module["config-opts"]
print("Flatpak manifest contract passed")

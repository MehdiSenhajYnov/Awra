// SPDX-License-Identifier: LGPL-2.1-or-later

int main () {
  var material = new Awra.Material.frosted ();
  return material.get_kind () == Awra.MaterialKind.FROSTED ? 0 : 1;
}


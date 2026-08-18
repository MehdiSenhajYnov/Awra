// SPDX-License-Identifier: LGPL-2.1-or-later

use crate::Inspector;
use std::{io, path::Path};

impl Inspector {
    /// Writes the compositor-neutral report using Rust's path and error types.
    ///
    /// This is the safe projection of the C `GError` export API that `gir`
    /// deliberately leaves for a manual binding.
    pub fn export_report_to(&self, path: impl AsRef<Path>) -> io::Result<()> {
        std::fs::write(path, self.dup_report().as_bytes())
    }
}

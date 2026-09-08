"""Minimal MIRNet building blocks required by the Dehamer U-Net.

``swin_unet.py`` imports ``MSRB`` from this module (``from MIRNet import *``).
The Multi-Scale Residual Block was originally introduced in
    MIRNet: Learning Enriched Features for Efficient Image Restoration
    (Zamir et al., ECCV 2020, https://github.com/swz30/MIRNet).

NOTE: in Dehamer's decoder the block is applied to feature maps whose spatial
resolution must be *preserved* (they are concatenated with same-resolution
skip-connections right afterwards).  The ``stride`` argument is therefore
accepted for API compatibility but the internal convolutions always run at
stride 1.
"""

import torch.nn as nn


class MSRB(nn.Module):
    """Multi-Scale Residual Block (resolution-preserving variant)."""

    def __init__(self, n_feat, height, width, stride, bias=False):
        super(MSRB, self).__init__()
        self.conv1 = nn.Conv2d(n_feat, n_feat, kernel_size=3, stride=1, padding=1, bias=bias)
        self.conv2 = nn.Conv2d(n_feat, n_feat, kernel_size=3, stride=1, padding=1, bias=bias)
        self.conv3 = nn.Conv2d(n_feat, n_feat * 4, kernel_size=3, stride=1, padding=1, bias=bias)
        self.conv4 = nn.Conv2d(n_feat * 4, n_feat * 4, kernel_size=3, stride=1, padding=1, bias=bias)
        self.conv5 = nn.Conv2d(n_feat * 4, n_feat, kernel_size=3, stride=1, padding=1, bias=bias)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        f1 = self.relu(self.conv1(x))
        f2 = self.relu(self.conv2(f1))
        f3 = self.relu(self.conv3(f2))
        f4 = self.relu(self.conv4(f3))
        f5 = self.relu(self.conv5(f4))
        return f5 + x
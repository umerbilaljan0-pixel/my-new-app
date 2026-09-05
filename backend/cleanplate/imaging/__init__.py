"""Imaging layer: media I/O (images + video) and shared pixel operations.

The operations here are CPU-capable *reference* implementations that make every
tool produce honest, non-destructive output without any model weights present.
When a tool's model is cached and a GPU is detected, the processor swaps the
reference op for the real network at the marked call sites.
"""

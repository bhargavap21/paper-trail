from manim import *
import numpy as np

class SimpleScene(Scene):
    def construct(self):
        title = Text('Understanding PDF Files', font_size=48).to_edge(UP)
        self.play(Write(title))
        self.wait(1)
        doc = Rectangle(height=3, width=2, color=BLUE)
        self.play(Create(doc))
        self.wait(2)
        text = Text('Digital Documents', font_size=36).next_to(doc, DOWN)
        self.play(FadeIn(text))
        self.wait(1)
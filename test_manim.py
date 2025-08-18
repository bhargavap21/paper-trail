from manim import *

class TestScene(Scene):
    def construct(self):
        title = Text("Test Video", font_size=48)
        circle = Circle(color=BLUE)
        
        self.play(Write(title))
        self.play(Create(circle))
        self.wait(1)
from manim import *
import numpy as np

class SimpleScene(Scene):
    def construct(self):
        # Geometry-focused animation
        title = Text("Geometric Shapes", font_size=40)
        title.to_edge(UP)
        
        # Create shapes
        circle = Circle(radius=1.5, color=BLUE)
        circle.shift(LEFT * 2)
        
        square = Square(side_length=2, color=RED)
        square.shift(RIGHT * 2)
        
        # Labels
        circle_label = Text("Circle", font_size=20)
        circle_label.next_to(circle, DOWN)
        
        square_label = Text("Square", font_size=20)
        square_label.next_to(square, DOWN)
        
        # Animation sequence
        self.play(Write(title))
        self.wait(0.5)
        
        self.play(Create(circle), Create(square))
        self.wait(1)
        
        self.play(Write(circle_label), Write(square_label))
        self.wait(1.5)
        
        # Transformation
        triangle = Triangle(color=GREEN)
        triangle.move_to(ORIGIN)
        triangle_label = Text("Triangle", font_size=20)
        triangle_label.next_to(triangle, DOWN)
        
        self.play(Transform(circle, triangle), 
                  Transform(circle_label, triangle_label),
                  FadeOut(square), FadeOut(square_label))
        self.wait(2)
        
        # Cleanup
        self.play(FadeOut(title), FadeOut(circle), FadeOut(circle_label))
        self.wait(0.5)
